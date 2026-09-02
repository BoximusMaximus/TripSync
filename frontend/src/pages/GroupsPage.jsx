import { useEffect, useState } from "react";
import api from "../utilities";
import { mockGroups, mockMembers} from "../mockData";
import GroupCard from "../components/GroupCard/GroupCard";

import {
  groupsPageClass,
  groupsHeaderClass,
  groupsTitleClass,
  groupsSubtitleClass,
  groupsNewButtonClass,
  groupsGridClass,
  groupsStatusClass,
  groupsErrorClass,
  groupFormClass,
  groupFormFieldClass,
  groupFormInputClass,
  groupFormSubmitClass,
  groupFormCancelClass,
} from "./styles/tailwindStyles";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyGroupId, setBusyGroupId] = useState(null);

  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState(null);

  const loadGroups = async () => {
    setLoading(true);
    setError("");

    try {
      // const response = await api.get("groups/");
      // setGroups(response.data);
      setGroups(mockGroups);
    } catch (err) {
      setError("Could not load groups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, 
  []);

  const handleCreateGroup = async (event) => {
    event.preventDefault();

    if (newGroupName.trim() === "") {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // const response = await api.post("groups/", { name: newGroupName });
      // setGroups([...groups, response.data]);
      const fakeGroup = {
        id: Date.now(),
        name: newGroupName,
        created_on: new Date().toISOString().slice(0, 10),
        member_count: 1,
        is_member: true,
        is_leader: true,
      };
      setGroups([...groups, fakeGroup]);

      setNewGroupName("");
      setShowForm(false);
    } catch (err) {
      setError("Could not create group.");
    } finally {
      setSubmitting(false);
    }
  };
  const handleJoinGroup = async (group) => {
    setBusyGroupId(group.id);
    setError("");

    try {
      // await api.post(`groups/${group.id}/join/`);
      setGroups(
        groups.map((item) =>
          item.id === group.id
            ? { ...item, is_member: true, member_count: item.member_count + 1 }
            : item,
        ),
      );
    } catch (err) {
      setError("Could not join group.");
    } finally {
      setBusyGroupId(null);
    }
  };

  const handleLeaveGroup = async (group) => {
    setBusyGroupId(group.id);
    setError("");

    try {
      // await api.delete(`groups/${group.id}/leave/`);
      setGroups(
        groups.map((item) =>
          item.id === group.id
            ? { ...item, is_member: false, member_count: item.member_count - 1 }
            : item,
        ),
      );
    } catch (err) {
      setError("Could not leave group.");
    } finally {
      setBusyGroupId(null);
    }
  };

  const handleToggleView = async (group) => {
    if (expandedGroupId === group.id) {
      setExpandedGroupId(null);
      return;
    }

    setExpandedGroupId(group.id);
    setMembersLoading(true);
    setError("");

    try {
      // const response = await api.get(`groups/${group.id}/members/`);
      // setMembers(response.data);
      setMembers(mockMembers.filter((member) => member.group_id === group.id));
    } catch (err) {
      setError("Could not load members.");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleToggleAccess = async (member, field) => {
    setBusyMemberId(member.id);
    setError("");

    try {
      // await api.patch(`memberships/${member.id}/`, {
      //   [field]: !member[field],
      // });
      setMembers(
        members.map((item) =>
          item.id === member.id ? { ...item, [field]: !item[field] } : item,
        ),
      );
    } catch (err) {
      setError("Could not update access.");
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRemoveMember = async (member) => {
    setBusyMemberId(member.id);
    setError("");

    try {
      // await api.delete(`memberships/${member.id}/`);
      setMembers(members.filter((item) => item.id !== member.id));

      setGroups(
        groups.map((item) =>
          item.id === member.group_id
            ? { ...item, member_count: item.member_count - 1 }
            : item,
        ),
      );
    } catch (err) {
      setError("Could not remove member.");
    } finally {
      setBusyMemberId(null);
    }
  };

  return (
    <div className={groupsPageClass}>
      <div className={groupsHeaderClass}>
        <h1 className={groupsTitleClass}>Groups</h1>
        <button
          className={groupsNewButtonClass}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ New Group"}
        </button>
      </div>

      <p className={groupsSubtitleClass}>
        Open to all users · creators grant/revoke read &amp; write access,
        rename, remove members, delete
      </p>
      {showForm && (
        <form className={groupFormClass} onSubmit={handleCreateGroup}>
          <label className={groupFormFieldClass}>
            Group name
            <input
              className={groupFormInputClass}
              type="text"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Ski Squad"
            />
          </label>

          <button
            className={groupFormSubmitClass}
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create group"}
          </button>

          <button
            className={groupFormCancelClass}
            type="button"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </button>
        </form>
      )}
      {loading && <p className={groupsStatusClass}>Loading groups...</p>}

      {error && <p className={groupsErrorClass}>{error}</p>}

      {!loading && !error && groups.length === 0 && (
        <p className={groupsStatusClass}>No groups yet.</p>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className={groupsGridClass}>
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onJoinClick={() => handleJoinGroup(group)}
              onLeaveClick={() => handleLeaveGroup(group)}
              busy={busyGroupId === group.id}
              onViewClick={() => handleToggleView(group)}
              expanded={expandedGroupId === group.id}
              members={members}
              membersLoading={membersLoading}
              onToggleAccess={handleToggleAccess}
              onRemoveMember={handleRemoveMember}
              busyMemberId={busyMemberId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
