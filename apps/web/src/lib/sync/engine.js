import { localDb } from "@/lib/db/local";
import { getSupabaseClient } from "@/lib/supabase/client";

let syncInProgress = false;

const TABLES = [
  "products",
  "purchases",
  "sales",
  "expenses",
  "clients",
  "client_transactions",
  "suppliers",
  "supplier_transactions",
  "invoices",
  "invoice_items",
];

const REMOTE_COLUMNS = {
  products: [
    "id",
    "shop_id",
    "code",
    "name",
    "purchase_price",
    "sale_price",
    "stock_initial",
    "alert_threshold",
    "supplier",
    "unit",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  purchases: [
    "id",
    "purchase_batch_id",
    "shop_id",
    "date",
    "supplier_id",
    "supplier",
    "product_id",
    "product_code",
    "product_name",
    "quantity",
    "unit_price",
    "charge_total",
    "charges",
    "total_amount",
    "payment_status",
    "payment_method",
    "payment_breakdown",
    "paid_amount",
    "remaining_amount",
    "notes",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  sales: [
    "id",
    "shop_id",
    "session_id",
    "sale_batch_id",
    "date",
    "store",
    "client_id",
    "client_name",
    "payment_status",
    "payment_method",
    "payment_breakdown",
    "advance_used",
    "paid_amount",
    "remaining_amount",
    "purchase_id",
    "product_id",
    "product_code",
    "product_name",
    "quantity",
    "unit_sale_price",
    "total_sale",
    "unit_purchase_cost",
    "total_purchase_cost",
    "profit",
    "created_at",
    "updated_at",
    "deleted_at",
    "cancelled_at",
    "is_charge",
  ],
  expenses: [
    "id",
    "shop_id",
    "date",
    "description",
    "amount",
    "category",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  clients: [
    "id",
    "shop_id",
    "name",
    "address",
    "phone",
    "email",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  client_transactions: [
    "id",
    "shop_id",
    "client_id",
    "date",
    "label",
    "type",
    "quantity",
    "unit_amount",
    "amount",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  suppliers: [
    "id",
    "shop_id",
    "name",
    "address",
    "phone",
    "email",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  supplier_transactions: [
    "id",
    "shop_id",
    "supplier_id",
    "date",
    "label",
    "quantity",
    "unit_amount",
    "amount",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  invoices: [
    "id",
    "shop_id",
    "invoice_number",
    "type",
    "source_type",
    "source_id",
    "client_id",
    "client_name",
    "client_address",
    "client_phone",
    "date",
    "city",
    "validity",
    "total_amount",
    "amount_in_words",
    "guarantee_text",
    "include_cachet",
    "include_signature",
    "status",
    "created_at",
    "updated_at",
    "deleted_at",
    "orientation",
  ],
  invoice_items: [
    "id",
    "invoice_id",
    "shop_id",
    "designation",
    "quantity",
    "unit",
    "unit_price",
    "total_price",
    "sort_order",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
};

function cleanForRemote(table, payload = {}) {
  const allowed = REMOTE_COLUMNS[table];
  if (!allowed) {
    const { sync_status, sync_error, _localId, ...rest } = payload;
    return rest;
  }

  const cleaned = {};

  for (const key of allowed) {
    if (payload[key] !== undefined) cleaned[key] = payload[key];
  }

  return cleaned;
}

async function getRemoteStock(supabase, shopId, salePayload) {
  const productId = salePayload.product_id;
  if (!productId) return Infinity;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, code, stock_initial")
    .eq("id", productId)
    .maybeSingle();

  if (productError) throw productError;
  if (!product) return Infinity;

  const [purchasesRes, salesRes] = await Promise.all([
    supabase
      .from("purchases")
      .select("quantity")
      .eq("shop_id", shopId)
      .eq("product_id", product.id)
      .is("deleted_at", null),

    supabase
      .from("sales")
      .select("id, quantity")
      .eq("shop_id", shopId)
      .eq("product_id", product.id)
      .is("deleted_at", null)
      .is("cancelled_at", null),
  ]);

  if (purchasesRes.error) throw purchasesRes.error;
  if (salesRes.error) throw salesRes.error;

  const bought = (purchasesRes.data || []).reduce(
    (sum, row) => sum + Number(row.quantity || 0),
    0,
  );

  const sold = (salesRes.data || [])
    .filter((row) => row.id !== salePayload.id)
    .reduce((sum, row) => sum + Number(row.quantity || 0), 0);

  return Number(product.stock_initial || 0) + bought - sold;
}

async function handleStockConflict(item, message) {
  const { table_name, record_id, _localId } = item;

  if (localDb[table_name]) {
    await localDb[table_name].where("id").equals(record_id).modify({
      sync_status: "conflict",
      sync_error: message,
    });
  }

  await localDb.sync_queue.delete(_localId);

  console.warn("[sync conflict]", {
    table: table_name,
    recordId: record_id,
    message,
  });
}

export async function runSync(shopId) {
  if (syncInProgress) return;
  if (!shopId) return;

  syncInProgress = true;
  const supabase = getSupabaseClient();

  try {
    // Pull first so desktop receives latest suppliers/stock before pushing offline changes.
    await pullFromRemote(shopId);

    const queue = await localDb.sync_queue.orderBy("created_at").toArray();

    let failCount = 0;

    for (const item of queue) {
      try {
        const { table_name, operation, payload, record_id, _localId } = item;
        const cleanPayload = cleanForRemote(table_name, payload);

        if (operation === "delete") {
          const { error } = await supabase
            .from(table_name)
            .update({ deleted_at: cleanPayload.deleted_at })
            .eq("id", cleanPayload.id);

          if (error) throw error;
        } else {
          if (
            table_name === "sales" &&
            !cleanPayload.cancelled_at &&
            !cleanPayload.deleted_at
          ) {
            const remoteAvailable = await getRemoteStock(
              supabase,
              shopId,
              cleanPayload,
            );
            const requested = Number(cleanPayload.quantity || 0);

            if (requested > remoteAvailable) {
              await handleStockConflict(
                item,
                `Conflit de stock: stock distant disponible ${remoteAvailable}, quantité locale ${requested}.`,
              );
              continue;
            }
          }

          const { error } = await supabase
            .from(table_name)
            .upsert(cleanPayload, { onConflict: "id" });

          if (error) throw error;
        }

        if (localDb[table_name]) {
          await localDb[table_name]
            .where("id")
            .equals(record_id)
            .modify({ sync_status: "synced", sync_error: null });
        }

        await localDb.sync_queue.delete(_localId);
      } catch (err) {
        failCount++;
        console.error("[sync push failed]", {
          table: item.table_name,
          recordId: item.record_id,
          message: err?.message,
        });
      }
    }

    await pullFromRemote(shopId);

    if (failCount > 0) {
      throw new Error(
        `${failCount} élément(s) n'ont pas pu être synchronisés. Vérifiez la console.`,
      );
    }
  } finally {
    syncInProgress = false;
  }
}

export async function pullFromRemote(shopId) {
  if (!shopId) return;

  const supabase = getSupabaseClient();

  for (const table of TABLES) {
    try {
      if (table === "invoice_items") {
        const { data: invoices, error: invoicesError } = await supabase
          .from("invoices")
          .select("id")
          .eq("shop_id", shopId);

        if (invoicesError) throw invoicesError;

        const invoiceIds = (invoices || []).map((x) => x.id);

        if (!invoiceIds.length) {
          await localDb.invoice_items.clear();
          continue;
        }

        const { data, error } = await supabase
          .from("invoice_items")
          .select("*")
          .in("invoice_id", invoiceIds);

        if (error) throw error;

        await localDb.invoice_items.bulkPut(
          (data || []).filter((row) => !row.deleted_at),
        );
        continue;
      }

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("shop_id", shopId);

      if (error) throw error;

      const remoteRows = data || [];
      const activeRows = remoteRows.filter((row) => !row.deleted_at);

      await localDb[table].bulkPut(activeRows);

      const deletedIds = remoteRows
        .filter((row) => row.deleted_at)
        .map((row) => row.id);

      if (deletedIds.length && localDb[table]) {
        await localDb[table].bulkDelete(deletedIds);
      }
    } catch (err) {
      console.warn("[sync pull failed]", table, err?.message);
    }
  }
}

export function startSyncListener(shopId) {
  if (typeof window === "undefined") return () => {};
  if (!shopId) return () => {};

  const handleOnline = () => runSync(shopId);

  window.addEventListener("online", handleOnline);

  const interval = setInterval(() => {
    if (navigator.onLine) runSync(shopId);
  }, 15000);

  return () => {
    window.removeEventListener("online", handleOnline);
    clearInterval(interval);
  };
}
