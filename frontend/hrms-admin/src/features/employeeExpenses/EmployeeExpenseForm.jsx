import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";

import {
  OFFICE_EXPENSE_CATEGORIES,
  OFFICE_EXPENSE_COLLECTION_MODES,
  OFFICE_EXPENSE_COLLECTION_STATUSES,
  OFFICE_EXPENSE_PURCHASE_TYPES,
  useEmployeeExpenseCategories,
} from "./useEmployeeExpenses";

import { useMyEmployee } from "@/hooks/useMyEmployee";


function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
      {children}

      {required && (
        <span className="ml-1 text-red-500">*</span>
      )}
    </label>
  );
}


export default function EmployeeExpenseForm({
  initialData = {},
  onSubmit,
  onCancel,
  loading,
  isEdit,
}) {
  const { data: expenseOptions } =
    useEmployeeExpenseCategories();

  const categories =
    expenseOptions?.categories?.length
      ? expenseOptions.categories
      : OFFICE_EXPENSE_CATEGORIES;

  const purchaseTypes =
    expenseOptions?.purchase_types?.length
      ? expenseOptions.purchase_types
      : OFFICE_EXPENSE_PURCHASE_TYPES;

  const collectionStatuses =
    expenseOptions?.collection_statuses?.length
      ? expenseOptions.collection_statuses
      : OFFICE_EXPENSE_COLLECTION_STATUSES;

  const collectionModes =
    expenseOptions?.collection_modes?.length
      ? expenseOptions.collection_modes
      : OFFICE_EXPENSE_COLLECTION_MODES;


  const { employee: myEmployee } =
    useMyEmployee();


  const [purchaseType, setPurchaseType] = useState(
    initialData.purchase_type ||
      OFFICE_EXPENSE_PURCHASE_TYPES[0]
  );


  const [category, setCategory] = useState(
    initialData.category || ""
  );


  const [itemName, setItemName] = useState(
    initialData.item_name || ""
  );


  const [amount, setAmount] = useState(
    initialData.amount !== undefined &&
      initialData.amount !== null
      ? String(initialData.amount)
      : ""
  );


  const [purchasedBy, setPurchasedBy] = useState(
    initialData.purchased_by || ""
  );


  const [purchasedFrom, setPurchasedFrom] = useState(
    initialData.purchased_from || ""
  );


  const [expenseDate, setExpenseDate] = useState(
    initialData.expense_date
      ? initialData.expense_date.slice(0, 10)
      : ""
  );


  const [collectionStatus, setCollectionStatus] =
    useState(
      initialData.collection_status ||
        "Not Collected"
    );


  const [collectionMode, setCollectionMode] =
    useState(
      initialData.collection_mode || ""
    );


  const [collectionDate, setCollectionDate] =
    useState(
      initialData.collection_date
        ? initialData.collection_date.slice(0, 10)
        : ""
    );


  const [description, setDescription] = useState(
    initialData.description || ""
  );


  const [receipt, setReceipt] = useState(null);

  const [error, setError] = useState("");


  const currentEmployeeName = [
    myEmployee?.first_name,
    myEmployee?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();


  useEffect(() => {
    if (
      !isEdit &&
      !purchasedBy &&
      currentEmployeeName
    ) {
      setPurchasedBy(currentEmployeeName);
    }
  }, [
    isEdit,
    purchasedBy,
    currentEmployeeName,
  ]);


  const handleSubmit = (event) => {
    event.preventDefault();

    if (!purchaseType) {
      setError("Please select a purchase type.");
      return;
    }

    if (!category) {
      setError("Please select a category.");
      return;
    }

    if (!itemName.trim()) {
      setError("Please enter the item name.");
      return;
    }

    const amountValue = Number(amount);

    if (
      !amount ||
      Number.isNaN(amountValue) ||
      amountValue <= 0
    ) {
      setError("Please enter a valid amount.");
      return;
    }

    if (!purchasedBy.trim()) {
      setError("Please enter Purchased By.");
      return;
    }

    if (!expenseDate) {
      setError("Please select the expense date.");
      return;
    }

    if (!collectionStatus) {
      setError("Please select the collection status.");
      return;
    }

    if (
      collectionStatus === "Collected" &&
      !collectionMode
    ) {
      setError(
        "Please select the collection mode."
      );
      return;
    }

    if (
      collectionStatus === "Collected" &&
      !collectionDate
    ) {
      setError(
        "Please select the collection date."
      );
      return;
    }

    setError("");


    const payload = {
      purchase_type: purchaseType,

      category,

      item_name: itemName.trim(),

      amount: amountValue,

      purchased_by: purchasedBy.trim(),

      purchased_from:
        purchasedFrom.trim() || undefined,

      expense_date: expenseDate,

      collection_status: collectionStatus,

      collection_mode:
        collectionStatus === "Collected"
          ? collectionMode
          : undefined,

      collection_date:
        collectionStatus === "Collected"
          ? collectionDate
          : undefined,

      description:
        description.trim() || undefined,
    };


    if (receipt) {
      payload.receipt = receipt;
    }


    onSubmit(payload);
  };


  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel required>
            Purchase Type
          </FieldLabel>

          <select
            value={purchaseType}
            onChange={(event) =>
              setPurchaseType(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          >
            <option value="">
              Select purchase type
            </option>

            {purchaseTypes.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}
          </select>
        </div>


        <div>
          <FieldLabel required>
            Category
          </FieldLabel>

          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          >
            <option value="">
              Select category
            </option>

            {categories.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel required>
            Item Name
          </FieldLabel>

          <input
            type="text"
            value={itemName}
            onChange={(event) =>
              setItemName(event.target.value)
            }
            placeholder="e.g. A4 Paper, Printer Ink, Cleaning Material"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          />
        </div>


        <div>
          <FieldLabel required>
            Amount (₹)
          </FieldLabel>

          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            placeholder="e.g. 1250"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          />
        </div>
      </div>


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel required>
            Purchased By
          </FieldLabel>

          <input
            type="text"
            value={purchasedBy}
            onChange={(event) =>
              setPurchasedBy(event.target.value)
            }
            placeholder="Enter the person's name"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          />

          <p className="mt-1 text-[11px] text-slate-400">
            Name of the person who purchased the item.
          </p>
        </div>


        <div>
          <FieldLabel>
            Purchased From
          </FieldLabel>

          <input
            type="text"
            value={purchasedFrom}
            onChange={(event) =>
              setPurchasedFrom(event.target.value)
            }
            placeholder="Vendor / Person / Shop / Source"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          />

          <p className="mt-1 text-[11px] text-slate-400">
            Enter the person or vendor from whom it was purchased.
          </p>
        </div>
      </div>


      <div>
        <FieldLabel required>
          Expense Date
        </FieldLabel>

        <input
          type="date"
          value={expenseDate}
          onChange={(event) =>
            setExpenseDate(event.target.value)
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
        />
      </div>


      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Amount Collection Details
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Track whether the amount related to this office expense has been collected.
          </p>
        </div>


        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel required>
              Collection Status
            </FieldLabel>

            <select
              value={collectionStatus}
              onChange={(event) => {
                const value =
                  event.target.value;

                setCollectionStatus(value);

                if (value !== "Collected") {
                  setCollectionMode("");
                  setCollectionDate("");
                }
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              {collectionStatuses.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                )
              )}
            </select>
          </div>


          {collectionStatus === "Collected" && (
            <>
              <div>
                <FieldLabel required>
                  Collection Mode
                </FieldLabel>

                <select
                  value={collectionMode}
                  onChange={(event) =>
                    setCollectionMode(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                >
                  <option value="">
                    Select collection mode
                  </option>

                  {collectionModes.map(
                    (mode) => (
                      <option
                        key={mode}
                        value={mode}
                      >
                        {mode}
                      </option>
                    )
                  )}
                </select>
              </div>


              <div>
                <FieldLabel required>
                  Collection Date
                </FieldLabel>

                <input
                  type="date"
                  value={collectionDate}
                  onChange={(event) =>
                    setCollectionDate(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                />
              </div>
            </>
          )}
        </div>
      </div>


      <div>
        <FieldLabel>
          Description
        </FieldLabel>

        <textarea
          rows={3}
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          placeholder="Add any additional office expense details..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
        />
      </div>


      <div>
        <FieldLabel>
          Receipt
        </FieldLabel>

        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(event) =>
            setReceipt(
              event.target.files?.[0] || null
            )
          }
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-600 hover:file:bg-primary-100 dark:text-slate-300 dark:file:bg-primary-500/10 dark:file:text-primary-400"
        />

        {isEdit &&
          initialData.receipt_url &&
          !receipt && (
            <p className="mt-1 text-xs text-slate-400">
              A receipt is already attached. Choose a new file to replace it.
            </p>
          )}
      </div>


      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          isLoading={loading}
        >
          {isEdit
            ? "Save Changes"
            : "Add Office Expense"}
        </Button>
      </div>
    </form>
  );
}

