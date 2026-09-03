<<<<<<< HEAD
import clsx from "clsx";

import {
  groupCardClass,
  groupCardHeaderClass,
  groupCardTitleClass,
  groupCardMetaClass,
  groupCardFooterClass,
  groupCardJoinClass,
  groupCardViewClass,
} from "./styles/tailwindStyles";

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

/**
 * `memberCount` is a computed API value (COUNT of memberships) — this
 * component only ever displays it, it never derives or stores it itself.
 */
const GroupCard = ({
  name,
  createdOn,
  memberCount,
  isMember = false,
  onJoin,
  onNavigate,
  className,
}) => {
  const displayName = name?.trim() ? name : "Untitled group";
  const displayDate = formatDate(createdOn);
  const displayCount = Number.isFinite(memberCount) ? memberCount : null;

  const metaParts = [];
  if (displayCount !== null) {
    metaParts.push(`${displayCount} member${displayCount === 1 ? "" : "s"}`);
  }
  if (displayDate) {
    metaParts.push(`created ${displayDate}`);
  }

  return (
    <div className={clsx(groupCardClass, className)}>
      <button
        type="button"
        className={groupCardHeaderClass}
        onClick={onNavigate}
        aria-label={`View ${displayName}`}
      >
        <h3 className={groupCardTitleClass}>{displayName}</h3>

        {metaParts.length > 0 && (
          <p className={groupCardMetaClass}>{metaParts.join(" · ")}</p>
        )}
      </button>

      <div className={groupCardFooterClass}>
        {!isMember && onJoin && (
          <button
            type="button"
            className={groupCardJoinClass}
            onClick={onJoin}
          >
            Join
          </button>
        )}

        <button
          type="button"
          className={groupCardViewClass}
          onClick={onNavigate}
        >
          View <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};

export default GroupCard;
=======
// import {
//   groupJoinButtonClass,
//   groupLeaveButtonClass,
//   groupMembersWrapClass,
//   groupMembersTitleClass,
//   groupMemberRowClass,
//   groupMemberNameClass,
//   groupMemberLeaderTagClass,
//   groupMemberActionsClass,
//   groupAccessToggleClass,
//   groupAccessToggleOnClass,
//   groupRemoveMemberClass,
//   groupMembersStatusClass,
// } from "../../pages/styles/tailwindStyles";


// export default function GroupCard({
//     group,
//     onJoinClick,
//     onLeaveClick,
//     onViewClick,
//     busy,
//     expanded,
//     members,
//     membersLoading,
//     onToggleAccess,
//     onRemoveMember,
//     busyMemberId,
// })
// {
//     return (
//         <div className="Group_Card">
//             <h3 className="Group_Name">{group.name}</h3>
//             <p className="Members">
//                 {group.member_count} members · created {group.created_on}
//             </p>
//             <div className="Join_Group">
//                 {/* this will be filed later */}
//                 {group.is_member ? (
//                     <button
//                         className={groupLeaveButtonClass}
//                         onClick={onLeaveClick}
//                         disabled={busy}
//                     >
//                         Leave
//                     </button>
//                 ) : (
//                     <button
//                         className={groupJoinButtonClass}
//                         onClick={onJoinClick}
//                         disabled={busy}
//                     >
//                         Join
//                     </button>
//                 )}
//                 {/* This will be filled later, but it needs to "View" to make it work for real. */}
//                 <button className="View_Button" onClick={onViewClick}>
//                     View
//                 </button>
//             </div>
//             {expanded && (
//                 <div className={groupMembersWrapClass}>
//                     <p className={groupMembersTitleClass}>Members</p>

//                     {membersLoading && (
//                         <p className={groupMembersStatusClass}>Loading...</p>
//                     )}

//                     {!membersLoading && members.length === 0 && (
//                         <p className={groupMembersStatusClass}>No members yet.</p>
//                     )}

//                     {!membersLoading &&
//                         members.map((member) => (
//                             <div key={member.id} className={groupMemberRowClass}>
//                                 <span className={groupMemberNameClass}>
//                                     {member.username}
//                                     {member.is_leader && (
//                                         <span className={groupMemberLeaderTagClass}>
//                                             leader
//                                         </span>
//                                     )}
//                                 </span>

//                                 {group.is_leader && !member.is_leader && (
//                                     <span className={groupMemberActionsClass}>
//                                         <button
//                                             className={
//                                                 member.read_access
//                                                     ? groupAccessToggleOnClass
//                                                     : groupAccessToggleClass
//                                             }
//                                             onClick={() =>
//                                                 onToggleAccess(member, "read_access")
//                                             }
//                                             disabled={busyMemberId === member.id}
//                                         >
//                                             read
//                                         </button>

//                                         <button
//                                             className={
//                                                 member.write_access
//                                                     ? groupAccessToggleOnClass
//                                                     : groupAccessToggleClass
//                                             }
//                                             onClick={() =>
//                                                 onToggleAccess(member, "write_access")
//                                             }
//                                             disabled={busyMemberId === member.id}
//                                         >
//                                             write
//                                         </button>

//                                         <button
//                                             className={groupRemoveMemberClass}
//                                             onClick={() => onRemoveMember(member)}
//                                             disabled={busyMemberId === member.id}
//                                         >
//                                             remove
//                                         </button>
//                                     </span>
//                                 )}
//                             </div>
//                         ))}
//                 </div>
//             )}
//         </div>
//     );
// }
>>>>>>> bea356fbdbb7f8aa06c85abf085ffdc200bb1cad
