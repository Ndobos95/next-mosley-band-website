export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <div className="text-center py-20">
          <h1 className="text-4xl font-bold mb-4">Band Program Website</h1>
          <p className="text-lg text-gray-600 mb-8">
            Welcome to your band program portal
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <div className="p-6 border rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Payments</h2>
              <p className="text-gray-600">Manage band fees and trip payments</p>
            </div>
            <div className="p-6 border rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Files</h2>
              <p className="text-gray-600">Access forms and documents</p>
            </div>
            <div className="p-6 border rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Calendar</h2>
              <p className="text-gray-600">View rehearsals and events</p>
            </div>
            <a href="/messages" className="p-6 border rounded-lg hover:border-blue-300 transition-colors">
              <h2 className="text-xl font-semibold mb-2">Messages</h2>
              <p className="text-gray-600">SQLite persistence test</p>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
