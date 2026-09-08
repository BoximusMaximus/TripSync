import { useEffect, useState } from "react";
import api from "../utilities";
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
  // const [newGroupName, setNewGroupName] = useState("");
  const [joinTripId, setJoinTripId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // const [busyGroupId, setBusyGroupId] = useState(null);

  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  // const [busyMemberId, setBusyMemberId] = useState(null);

  // A group is the member list of one trip. The backend returns
  // { id, auth_user: [user ids], trip: trip id }, so the trip is fetched
  // for its name and the fields the card expects are built here.
  const groupFromResponse = async (group) => {
    const tripResponse = await api.get(`trips/${group.trip}/`);
    return {
      id: group.id,
      trip_id: group.trip,
      name: tripResponse.data.name,
      member_ids: group.auth_user,
      member_count: group.auth_user.length,
      is_member: true,
    };
  };

  const loadGroups = async () => {
    setLoading(true);
    setError("");

    try {
      // const response = await api.get("groups/");
      // setGroups(response.data);
      const response = await api.get("users/groups/");
      const loadedGroups = [];
      for (const group of response.data) {
        loadedGroups.push(await groupFromResponse(group));
      }
      setGroups(loadedGroups);
    } catch (err) {
      setError("Could not load groups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  // const handleCreateGroup = async (event) => {
  //   event.preventDefault();
  //
  //   if (newGroupName.trim() === "") {
  //     return;
  //   }
  //
  //   setSubmitting(true);
  //   setError("");
  //
  //   try {
  //     const response = await api.post("groups/", { name: newGroupName });
  //     setGroups([...groups, response.data]);
  //     setNewGroupName("");
  //     setShowForm(false);
  //   } catch (err) {
  //     setError("Could not create group.");
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

  // Joining is by trip: POST groups/create/ with the trip id adds the
  // current user to that trip's group (creating the group if needed).
  const handleJoinByTripId = async (event) => {
    event.preventDefault();

    if (joinTripId.trim() === "") {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.post("groups/create/", { trip_id: Number(joinTripId) });
      setJoinTripId("");
      setShowForm(false);
      await loadGroups();
    } catch (err) {
      setError("Could not join group.");
    } finally {
      setSubmitting(false);
    }
  };

  // const handleJoinGroup = async (group) => {
  //   setBusyGroupId(group.id);
  //   setError("");
  //
  //   try {
  //     await api.post(`groups/${group.id}/join/`);
  //     setGroups(
  //       groups.map((item) =>
  //         item.id === group.id
  //           ? { ...item, is_member: true, member_count: item.member_count + 1 }
  //           : item,
  //       ),
  //     );
  //   } catch (err) {
  //     setError("Could not join group.");
  //   } finally {
  //     setBusyGroupId(null);
  //   }
  // };

  // const handleLeaveGroup = async (group) => {
  //   setBusyGroupId(group.id);
  //   setError("");
  //
  //   try {
  //     await api.delete(`groups/${group.id}/leave/`);
  //     setGroups(
  //       groups.map((item) =>
  //         item.id === group.id
  //           ? { ...item, is_member: false, member_count: item.member_count - 1 }
  //           : item,
  //       ),
  //     );
  //   } catch (err) {
  //     setError("Could not leave group.");
  //   } finally {
  //     setBusyGroupId(null);
  //   }
  // };

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
      const response = await api.get(`groups/${group.id}/`);
      setMembers(
        response.data.auth_user.map((userId) => ({
          id: userId,
          username: `user #${userId}`,
        })),
      );
    } catch (err) {
      setError("Could not load members.");
    } finally {
      setMembersLoading(false);
    }
  };

  // const handleToggleAccess = async (member, field) => {
  //   setBusyMemberId(member.id);
  //   setError("");
  //
  //   try {
  //     await api.patch(`memberships/${member.id}/`, {
  //       [field]: !member[field],
  //     });
  //     setMembers(
  //       members.map((item) =>
  //         item.id === member.id ? { ...item, [field]: !item[field] } : item,
  //       ),
  //     );
  //   } catch (err) {
  //     setError("Could not update access.");
  //   } finally {
  //     setBusyMemberId(null);
  //   }
  // };

  // const handleRemoveMember = async (member) => {
  //   setBusyMemberId(member.id);
  //   setError("");
  //
  //   try {
  //     await api.delete(`memberships/${member.id}/`);
  //     setMembers(members.filter((item) => item.id !== member.id));
  //
  //     setGroups(
  //       groups.map((item) =>
  //         item.id === member.group_id
  //           ? { ...item, member_count: item.member_count - 1 }
  //           : item,
  //       ),
  //     );
  //   } catch (err) {
  //     setError("Could not remove member.");
  //   } finally {
  //     setBusyMemberId(null);
  //   }
  // };

  return (
    <div className={groupsPageClass}>
      <div className={groupsHeaderClass}>
        <h1 className={groupsTitleClass}>Groups</h1>
        <button
          className={groupsNewButtonClass}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ Join Group"}
        </button>
      </div>

      {/* <p className={groupsSubtitleClass}>
        Open to all users · creators grant/revoke read &amp; write access,
        rename, remove members, delete
      </p> */}

      {/* <form className={groupFormClass} onSubmit={handleCreateGroup}>
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
        <button className={groupFormSubmitClass} type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create group"}
        </button>
      </form> */}

      {showForm && (
        <form className={groupFormClass} onSubmit={handleJoinByTripId}>
          <label className={groupFormFieldClass}>
            Trip ID
            <input
              className={groupFormInputClass}
              type="number"
              min="1"
              value={joinTripId}
              onChange={(event) => setJoinTripId(event.target.value)}
              placeholder="1"
            />
          </label>

          <button
            className={groupFormSubmitClass}
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Joining..." : "Join group"}
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
              // onJoinClick={() => handleJoinGroup(group)}
              // onLeaveClick={() => handleLeaveGroup(group)}
              // busy={busyGroupId === group.id}
              onViewClick={() => handleToggleView(group)}
              expanded={expandedGroupId === group.id}
              members={members}
              membersLoading={membersLoading}
              // onToggleAccess={handleToggleAccess}
              // onRemoveMember={handleRemoveMember}
              // busyMemberId={busyMemberId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
