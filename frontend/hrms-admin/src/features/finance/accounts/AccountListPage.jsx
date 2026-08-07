import GenericListPage from "@/components/table/GenericListPage";
import AccountForm from "./AccountForm";
import { financeApi } from "@/api/finance.api";
import { useAccounts, useCreateAccount, useUpdateAccount, useDeactivateAccount } from "./useAccounts";
import { formatCurrency } from "@/utils/formatCurrency";

const COLUMNS = [
  { key: "account_name", label: "Account Name" },
  { key: "account_type", label: "Type" },
  { key: "balance", label: "Balance", render: (r) => formatCurrency(r.balance) },
];

export default function AccountListPage() {
  return (
    <GenericListPage
        module="Accounts"
      title="Accounts"
      subtitle="Finance ledger accounts"
      columns={COLUMNS}
      api={financeApi.accounts}
      useList={useAccounts}
      useCreate={useCreateAccount}
      useUpdate={useUpdateAccount}
      useRemove={useDeactivateAccount}
      filename="accounts"
      searchPlaceholder="Search by account name or type..."
      FormComponent={AccountForm}
      formTitle="Account"
      addLabel="Add Account"
      actionsMode="none"
      entityLabel="Account"
    />
  );
}
