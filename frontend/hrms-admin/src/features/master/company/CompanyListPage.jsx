import { useState } from "react";

import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeactivateCompany,
} from "./useCompanies";

import CompanyForm from "./CompanyForm";

import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";

export default function CompanyListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useCompanies({
    page,
    search,
  });

  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deactivateCompany = useDeactivateCompany();

  const companies = data?.items || data?.data || [];

  // =========================
  // ADD COMPANY
  // =========================
  const handleAdd = () => {
    setSelectedCompany(null);
    setModalOpen(true);
  };

  // =========================
  // EDIT COMPANY
  // =========================
  const handleEdit = (company) => {
    setSelectedCompany(company);
    setModalOpen(true);
  };

  // =========================
  // CLOSE FORM
  // =========================
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCompany(null);
  };

  // =========================
  // SUBMIT COMPANY
  // =========================
  const handleSubmit = async (payload) => {
    try {
      if (selectedCompany) {
        await updateCompany.mutateAsync({
          id: selectedCompany.id,
          payload,
        });
      } else {
        await createCompany.mutateAsync(payload);
      }

      handleCloseModal();
    } catch (err) {
      console.error("Company save failed:", err);
    }
  };

  // =========================
  // DELETE COMPANY
  // =========================
  const handleDelete = (company) => {
    setCompanyToDelete(company);
    setDeleteOpen(true);
  };

  // =========================
  // CONFIRM DELETE
  // =========================
  const confirmDelete = async () => {
    if (!companyToDelete) return;

    try {
      await deactivateCompany.mutateAsync(companyToDelete.id);

      setDeleteOpen(false);
      setCompanyToDelete(null);
    } catch (err) {
      console.error("Company deactivate failed:", err);
    }
  };

  // =========================
  // TABLE COLUMNS
  // =========================
  const columns = [
    {
      header: "Company",
      accessorKey: "name",
    },

    {
      header: "Code",
      accessorKey: "code",
    },

    {
      header: "Email",
      accessorKey: "email",
    },

    {
      header: "Phone",
      accessorKey: "phone",
    },

    {
      header: "Branches",
      cell: ({ row }) => {
        const branches = row.original.branches;

        return (
          <span>
            {Array.isArray(branches) ? branches.length : 0}
          </span>
        );
      },
    },

    {
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.status;

        return (
          <Badge variant={isActive ? "success" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },

    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => handleEdit(row.original)}
          >
            Edit
          </Button>

          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => handleDelete(row.original)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // =========================
  // ERROR
  // =========================
  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
          <h2 className="font-semibold">
            Failed to load companies
          </h2>

          <p className="mt-1 text-sm">
            {error?.response?.data?.message ||
              error?.message ||
              "Unable to load companies."}
          </p>
        </div>
      </div>
    );
  }

  // =========================
  // PAGE
  // =========================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Company
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage companies and their branches.
          </p>
        </div>

        {/* ADD COMPANY BUTTON */}
        <Button
          type="button"
          onClick={handleAdd}
        >
          Add Company
        </Button>
      </div>

      {/* SEARCH */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search companies..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 md:w-80 dark:border-slate-600 dark:bg-slate-800"
        />
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={companies}
        loading={isLoading}
        page={page}
        onPageChange={setPage}
        pagination={data}
      />

      {/* ADD / EDIT COMPANY MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={selectedCompany ? "Edit Company" : "Add Company"}
      >
        <CompanyForm
          initialData={selectedCompany}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          isSubmitting={
            createCompany.isPending ||
            updateCompany.isPending
          }
        />
      </Modal>

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setCompanyToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Company"
        message={
          companyToDelete
            ? `Are you sure you want to deactivate "${companyToDelete.name}"?`
            : "Are you sure you want to deactivate this company?"
        }
        loading={deactivateCompany.isPending}
      />
    </div>
  );
}