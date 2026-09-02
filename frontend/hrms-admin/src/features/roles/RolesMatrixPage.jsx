import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { rolesApi } from "@/api/roles.api";
import { useToast } from "@/components/feedback/Toast";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import { use3DTilt, useMagnetic, Motion3DStyles } from "@/hooks/use3DMotion";

/* 3D tilt+glare module permission group. */
function ModuleGroup({ module, perms, selected, onToggle, index }) {
  const { ref, handlers } = use3DTilt({ max: 6, scale: 1.012 });

  return (
    <div
      className="u-tilt-perspective u-rise"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <div
        ref={ref}
        {...handlers}
        className="u-tilt u-glare relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"
      >
        <div className="u-tilt-content">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{module}</h3>
          <div className="flex flex-wrap gap-4">
            {perms.map((perm) => (
              <label
                key={perm.id}
                className="inline-flex items-center gap-2 text-sm text-slate-700 transition-transform duration-150 hover:scale-105 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selected.has(perm.id)}
                  onChange={() => onToggle(perm.id)}
                />
                {perm.action}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Permission grid (Frame 05): rows are Permission catalog entries
// (module x action), grouped by module, columns are just a single
// checkbox per row for the role selected via the URL param. Saved as a
// single PUT of the full permission_ids set for that role.
export default function RolesMatrixPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const roleId = Number(id);

  const { data: role } = useQuery({
    queryKey: ["roles", "item", roleId],
    queryFn: async () => (await rolesApi.get(roleId)).data.data,
  });

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["permissions-catalog"],
    queryFn: async () => (await rolesApi.permissionsCatalog()).data.data,
  });

  const { data: rolePermissions, isLoading: rpLoading } = useQuery({
    queryKey: ["role-permissions", roleId],
    queryFn: async () => (await rolesApi.getRolePermissions(roleId)).data.data,
    enabled: !!roleId,
  });

  const [selected, setSelected] = useState(new Set());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (rolePermissions?.permission_ids) {
      setSelected(new Set(rolePermissions.permission_ids));
      setDirty(false);
    }
  }, [rolePermissions]);

  const grouped = useMemo(() => {
    const groups = {};
    (catalog || []).forEach((perm) => {
      if (!groups[perm.module]) groups[perm.module] = [];
      groups[perm.module].push(perm);
    });
    return groups;
  }, [catalog]);

  const toggle = (permId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => rolesApi.setRolePermissions(roleId, Array.from(selected)),
    onSuccess: () => {
      showToast("Role permissions updated", "success");
      setDirty(false);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || "Failed to save permissions", "error");
    },
  });

  const loading = catalogLoading || rpLoading;
  const saveMagnet = useMagnetic(0.22);

  return (
    <div className="max-w-6xl mx-auto">
      <Motion3DStyles />

      <div className="u-rise flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Permissions — {role?.name || `Role #${roleId}`}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Toggle module/action permissions for this role.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate("/roles")}
          className="transition-transform duration-200 hover:-translate-y-0.5"
        >
          Back to Roles
        </Button>
      </div>

      <div className="u-rise card p-6" style={{ animationDelay: "60ms" }}>
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(grouped).map(([module, perms], i) => (
              <ModuleGroup
                key={module}
                module={module}
                perms={perms}
                selected={selected}
                onToggle={toggle}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      {dirty && (
        <div className="sticky bottom-4 mt-4 flex justify-end">
          <div className="card px-4 py-3 flex items-center gap-3 shadow-lg">
            <span className="text-sm text-slate-600 dark:text-slate-300">Unsaved changes</span>
            <div ref={saveMagnet.ref} {...saveMagnet.handlers} className="inline-block will-change-transform">
              <Button
                onClick={() => saveMutation.mutate()}
                isLoading={saveMutation.isPending}
                className="shadow-sm transition-shadow duration-200 hover:shadow-lg"
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
