import {
  groupJoinButtonClass,
  groupLeaveButtonClass,
  groupMembersWrapClass,
  groupMembersTitleClass,
  groupMemberRowClass,
  groupMemberNameClass,
  groupMemberLeaderTagClass,
  groupMemberActionsClass,
  groupAccessToggleClass,
  groupAccessToggleOnClass,
  groupRemoveMemberClass,
  groupMembersStatusClass,
} from "../../pages/styles/tailwindStyles";


export default function GroupCard({
    group,
    onJoinClick,
    onLeaveClick,
    onViewClick,
    busy,
    expanded,
    members,
    membersLoading,
    onToggleAccess,
    onRemoveMember,
    busyMemberId,
})
{
    return (
        <div className="Group_Card">
            <h3 className="Group_Name">{group.name}</h3>
            <p className="Members">
                {group.member_count} members · created {group.created_on}
            </p>
            <div className="Join_Group">
                {/* this will be filed later */}
                {group.is_member ? (
                    <button
                        className={groupLeaveButtonClass}
                        onClick={onLeaveClick}
                        disabled={busy}
                    >
                        Leave
                    </button>
                ) : (
                    <button
                        className={groupJoinButtonClass}
                        onClick={onJoinClick}
                        disabled={busy}
                    >
                        Join
                    </button>
                )}
                {/* This will be filled later, but it needs to "View" to make it work for real. */}
                <button className="View_Button" onClick={onViewClick}>
                    View
                </button>
            </div>
            {expanded && (
                <div className={groupMembersWrapClass}>
                    <p className={groupMembersTitleClass}>Members</p>

                    {membersLoading && (
                        <p className={groupMembersStatusClass}>Loading...</p>
                    )}

                    {!membersLoading && members.length === 0 && (
                        <p className={groupMembersStatusClass}>No members yet.</p>
                    )}

                    {!membersLoading &&
                        members.map((member) => (
                            <div key={member.id} className={groupMemberRowClass}>
                                <span className={groupMemberNameClass}>
                                    {member.username}
                                    {member.is_leader && (
                                        <span className={groupMemberLeaderTagClass}>
                                            leader
                                        </span>
                                    )}
                                </span>

                                {group.is_leader && !member.is_leader && (
                                    <span className={groupMemberActionsClass}>
                                        <button
                                            className={
                                                member.read_access
                                                    ? groupAccessToggleOnClass
                                                    : groupAccessToggleClass
                                            }
                                            onClick={() =>
                                                onToggleAccess(member, "read_access")
                                            }
                                            disabled={busyMemberId === member.id}
                                        >
                                            read
                                        </button>

                                        <button
                                            className={
                                                member.write_access
                                                    ? groupAccessToggleOnClass
                                                    : groupAccessToggleClass
                                            }
                                            onClick={() =>
                                                onToggleAccess(member, "write_access")
                                            }
                                            disabled={busyMemberId === member.id}
                                        >
                                            write
                                        </button>

                                        <button
                                            className={groupRemoveMemberClass}
                                            onClick={() => onRemoveMember(member)}
                                            disabled={busyMemberId === member.id}
                                        >
                                            remove
                                        </button>
                                    </span>
                                )}
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}