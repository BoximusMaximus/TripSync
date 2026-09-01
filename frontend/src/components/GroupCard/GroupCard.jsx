



export default function GroupCard({
    group,
    onJoinClick,
    onLeaveClick,
    onViewClick,
}) 
{
    return (
        <div className="Group_Card">
            <h3 className="Group_Name">{group.name}</h3>
            <p className="Members">
                {group.member_count} members - created {group.created_on}
            </p>
            <div className="Join_Group">
                {/* this will be filed later */}
                <button
                    className="Join_Button"
                    onClick={onJoinClick}
                >
                    Join
                </button>
                {/* This will be filled later, but it needs to "View" to make it work for real. */}
                <button className="View_Button" onClick={onViewClick}>
                    View
                </button>
            </div>
        </div>
    );
}