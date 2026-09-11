import { useOutletContext } from "react-router-dom";

const ProfilePage = () => {
  const { user } = useOutletContext();

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-3xl font-bold">Profile</h1>

        <div className="rounded-xl border border-gray-300 p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-500">
              Username
            </p>
            <p className="text-lg">{user?.username}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-500">
              Email
            </p>
            <p className="text-lg">{user?.email}</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProfilePage;
