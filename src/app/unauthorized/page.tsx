import { getSession } from "@/lib/session";

export default async function UnauthorizedPage() {
  const session = await getSession();
  const email = session.userEmail ?? "okänd e-post";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Åtkomst nekad
          </h1>

          <p className="text-gray-600 text-sm mb-1">
            Du är inloggad som:
          </p>
          <p className="text-gray-900 font-medium text-sm mb-4 break-all">
            {email}
          </p>

          <p className="text-gray-500 text-sm mb-6">
            Det här kontot har inte tillgång till applikationen. Kontakta
            administratören för att få åtkomst.
          </p>

          <a
            href="/api/logout"
            className="inline-block px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-700 transition-colors"
          >
            Logga ut
          </a>
        </div>
      </div>
    </div>
  );
}
