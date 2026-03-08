import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ActionIconButton } from "../../components/ui/ActionIconButton";
import { Role, User } from "../../types";
import { userService } from "../../services/userService";

interface UserForm {
  name: string;
  email: string;
  role: Role;
  password: string;
}

type SortKey = "name" | "email" | "role";

const roleOptions: Role[] = ["super_admin", "admin", "staff"];

const emptyForm: UserForm = {
  name: "",
  email: "",
  role: "staff",
  password: ""
};

const readErrorMessage = (error: any, fallback: string) => {
  const payload = error?.response?.data;
  if (!payload) return fallback;
  if (typeof payload.detail === "string") return payload.detail;
  if (typeof payload.message === "string") return payload.message;
  if (typeof payload === "object") {
    const firstKey = Object.keys(payload)[0];
    const value = payload[firstKey];
    if (Array.isArray(value) && value.length > 0) return String(value[0]);
    if (typeof value === "string") return value;
  }
  return fallback;
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: userService.list });
  const allUsers = users ?? [];

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, pageSize]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allUsers.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      if (!query) return matchesRole;
      const searchable = `${user.name} ${user.email} ${user.role}`.toLowerCase();
      return matchesRole && searchable.includes(query);
    });
  }, [allUsers, searchQuery, roleFilter]);

  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    sorted.sort((a, b) => {
      const left = String(a[sortKey] ?? "").toLowerCase();
      const right = String(b[sortKey] ?? "").toLowerCase();
      if (left < right) return sortOrder === "asc" ? -1 : 1;
      if (left > right) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredUsers, sortKey, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + pageSize);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const createMutation = useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      toast.success("User created");
      setForm(emptyForm);
      setShowCreateModal(false);
      refresh();
    },
    onError: (error: any) => toast.error(readErrorMessage(error, "Unable to create user"))
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UserForm }) =>
      userService.update(userId, {
        name: payload.name,
        email: payload.email,
        role: payload.role,
        password: payload.password || undefined
      }),
    onSuccess: () => {
      toast.success("User updated");
      setShowEditModal(false);
      setEditUser(null);
      refresh();
    },
    onError: (error: any) => toast.error(readErrorMessage(error, "Unable to update user"))
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => userService.remove(userId),
    onSuccess: () => {
      toast.success("User deleted");
      refresh();
    },
    onError: (error: any) => toast.error(readErrorMessage(error, "Unable to delete user"))
  });

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortOrder("asc");
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, password: "" });
    setShowEditModal(true);
  };

  return (
    <div className="grid">
      <Card>
        <div className="table-toolbar">
          <div>
            <h2 className="page-title">User Management</h2>
            <p className="section-subtitle">Create and manage super admin, admin, and staff accounts.</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>+ Add User</Button>
        </div>

        <div className="table-filters">
          <label>
            Search
            <input className="input" placeholder="Search name or email" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </label>
          <label>
            Role
            <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label>
            Page Size
            <select className="select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {[5, 10, 20].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <table className="table table-striped">
          <thead>
            <tr>
              <th>
                <button className="sort-btn" type="button" onClick={() => onSort("name")}>
                  Name {sortIndicator("name")}
                </button>
              </th>
              <th>
                <button className="sort-btn" type="button" onClick={() => onSort("email")}>
                  Email {sortIndicator("email")}
                </button>
              </th>
              <th>
                <button className="sort-btn" type="button" onClick={() => onSort("role")}>
                  Role {sortIndicator("role")}
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <div className="icon-actions">
                    <ActionIconButton
                      action="view"
                      aria-label="View user"
                      onClick={() => {
                        setViewUser(user);
                        setShowViewModal(true);
                      }}
                    />
                    <ActionIconButton action="edit" aria-label="Edit user" onClick={() => openEdit(user)} />
                    <ActionIconButton
                      action="delete"
                      aria-label="Delete user"
                      onClick={() => {
                        const confirmed = window.confirm(`Delete user ${user.name}?`);
                        if (!confirmed) return;
                        deleteMutation.mutate(user.id);
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={4}>No users found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="pagination-row">
          <p>
            Showing {filteredUsers.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, filteredUsers.length)} of {filteredUsers.length}
          </p>
          <div className="actions-row">
            <button className="icon-btn" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <span className="chip">
              Page {safePage} / {totalPages}
            </span>
            <button className="icon-btn" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </button>
          </div>
        </div>
      </Card>

      {showCreateModal ? (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>Add User</h3>
              <button className="icon-btn" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <form
              className="grid"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate({ name: form.name, email: form.email, role: form.role, password: form.password });
              }}
            >
              <label>
                Name
                <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label>
                Email
                <input className="input" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </label>
              <label>
                Role
                <select className="select" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Password
                <input className="input" type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              </label>
              <Button disabled={createMutation.isPending}>{createMutation.isPending ? "Saving..." : "Create User"}</Button>
            </form>
          </div>
        </div>
      ) : null}

      {showViewModal && viewUser ? (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>User Details</h3>
              <button className="icon-btn" onClick={() => setShowViewModal(false)}>
                ✕
              </button>
            </div>
            <p>
              <strong>Name:</strong> {viewUser.name}
            </p>
            <p>
              <strong>Email:</strong> {viewUser.email}
            </p>
            <p>
              <strong>Role:</strong> {viewUser.role}
            </p>
          </div>
        </div>
      ) : null}

      {showEditModal && editUser ? (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-toolbar">
              <h3>Edit User</h3>
              <button className="icon-btn" onClick={() => setShowEditModal(false)}>
                ✕
              </button>
            </div>
            <form
              className="grid"
              onSubmit={(event) => {
                event.preventDefault();
                updateMutation.mutate({ userId: editUser.id, payload: form });
              }}
            >
              <label>
                Name
                <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label>
                Email
                <input className="input" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </label>
              <label>
                Role
                <select className="select" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Password (optional)
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </label>
              <Button disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
