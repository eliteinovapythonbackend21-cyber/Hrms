import { useState } from "react";

import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeactivateBranch,
} from "./useBranches";

import { useCompanies } from "@/features/master/company/useCompanies";

import BranchForm from "./BranchForm";

import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";

export default function BranchListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);

  const { data: companyData } = useCompanies({
    page: 1,
    per_page: 100,
  });

  const {
    data,
    isLoading,
    isError,
    error,
  } = useBranches({
    page,
    search,
    ...(companyId
      ? { company_id: companyId }
      : {}),
  });

  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deactivateBranch = useDeactivateBranch();

  const companies =
    companyData?.items ||
    companyData?.data ||
    [];

  const branches =
    data?.items ||
    data?.data ||
    [];

  const handleAdd = () => {
    setSelectedBranch(null);
    setModalOpen(true);
  };

  const handleEdit = (branch) => {
    setSelectedBranch(branch);
    setModalOpen(true);
  };

  const handleDelete = (branch) => {
    setBranchToDelete(branch);
    setDeleteOpen(true);
  };

  const handleSubmit = async (payload) => {
    if (selectedBranch) {
      await updateBranch.mutateAsync({
        id: selectedBranch.id,
        payload,
      });
    } else {
      if (!payload.company_id) {
        return;
      }

      await createBranch.mutateAsync({
        companyId: payload.company_id,
        payload,
      });
    }

    setModalOpen(false);
    setSelectedBranch(null);
  };

  const confirmDelete = async () => {
    if (!branchToDelete) return;

    await deactivateBranch.mutateAsync(
      branchToDelete.id
    );

    setDeleteOpen(false);
    setBranchToDelete(null);
  };

  const columns = [
    {
      header: "Branch",
      accessorKey: "name",
    },
    {
      header: "Code",
      accessorKey: "code",
    },
    {
      header: "Company",
      cell: ({ row }) =>
        row.original.company?.name || "-",
    },
    {
      header: "City",
      accessorKey: "city",
    },
    {
      header: "Phone",
      accessorKey: "phone",
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
          "Failed to load branches"}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Branches
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Manage company branches.
          </p>
        </div>

        <Button onClick={handleAdd}>
          Add Branch
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search branches..."
          className="w-full md:w-80 rounded-lg border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600"
        />

        <select
          value={companyId}
          onChange={(e) => {
            setCompanyId(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600"
        >
          <option value="">
            All Companies
          </option>

          {companies.map((company) => (
            <option
              key={company.id}
              value={company.id}
            >
              {company.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={branches}
        loading={isLoading}
        page={page}
        onPageChange={setPage}
        pagination={data}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedBranch(null);
        }}
        title={
          selectedBranch
            ? "Edit Branch"
            : "Add Branch"
        }
      >
        <BranchForm
          initialData={selectedBranch}
          onSubmit={handleSubmit}
          onCancel={() => {
            setModalOpen(false);
            setSelectedBranch(null);
          }}
          isSubmitting={
            createBranch.isPending ||
            updateBranch.isPending
          }
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setBranchToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Branch"
        message={
          branchToDelete
            ? `Are you sure you want to deactivate "${branchToDelete.name}"?`
            : "Are you sure you want to deactivate this branch?"
        }
        loading={deactivateBranch.isPending}
      />
    </div>
  );
}