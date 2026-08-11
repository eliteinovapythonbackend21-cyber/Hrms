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

  const handleAdd = () => {
    setSelectedCompany(null);
    setModalOpen(true);
  };

  const handleEdit = (company) => {
    setSelectedCompany(company);
    setModalOpen(true);
  };

  const handleDelete = (company) => {
    setCompanyToDelete(company);
    setDeleteOpen(true);
  };

  const handleSubmit = async (payload) => {
    if (selectedCompany) {
      await updateCompany.mutateAsync({
        id: selectedCompany.id,
        payload,
      });
    } else {
      await createCompany.mutateAsync(payload);
    }

    setModalOpen(false);
    setSelectedCompany(null);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;

    await deactivateCompany.mutateAsync(
      companyToDelete.id
    );

    setDeleteOpen(false);
    setCompanyToDelete(null);
  };

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
      cell: ({ row }) => (
        <span>
          {row.original.branches?.length || 0}
        </span>
      ),
    },
    {
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status
              ? "success"
              : "secondary"
          }
        >
          {row.original.status
            ? "Active"
            : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              handleEdit(row.original)
            }
          >
            Edit
          </Button>

          <Button
            size="sm"
            variant="danger"
            onClick={() =>
              handleDelete(row.original)
            }
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="text-red-500">
        {error?.response?.data?.message ||
          "Failed to load companies"}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Company
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Manage companies and their branches.
          </p>
        </div>

        <Button onClick={handleAdd}>
          Add Company
        </Button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search companies..."
          className="w-full md:w-80 rounded-lg border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600"
        />
      </div>

      <DataTable
        columns={columns}
        data={companies}
        loading={isLoading}
        page={page}
        onPageChange={setPage}
        pagination={data}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedCompany(null);
        }}
        title={
          selectedCompany
            ? "Edit Company"
            : "Add Company"
        }
      >
        <CompanyForm
          initialData={selectedCompany}
          onSubmit={handleSubmit}
          onCancel={() => {
            setModalOpen(false);
            setSelectedCompany(null);
          }}
          isSubmitting={
            createCompany.isPending ||
            updateCompany.isPending
          }
        />
      </Modal>

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