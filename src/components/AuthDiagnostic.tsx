import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUserData } from '@/hooks/useUserData'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const AuthDiagnostic = () => {
  const { user, session } = useAuth()
  const { userData } = useUserData()
  const [journalEntries, setJournalEntries] = useState<any[]>([])
  const [allUserIds, setAllUserIds] = useState<any[]>([])

  const checkData = async () => {
    // Get all journal entries
    const { data: entries } = await supabase
      .from('journal_entries')
      .select('*')
      .order('received_at', { ascending: false })
    
    setJournalEntries(entries || [])

    // Get all user IDs from users_app
    const { data: users } = await supabase
      .from('users_app')
      .select('id, auth_user_id, email, name')
    
    setAllUserIds(users || [])
  }

  useEffect(() => {
    checkData()
  }, [])

  return (
    <Card className="w-full max-w-4xl mx-auto mb-6">
      <CardHeader>
        <CardTitle>🔍 Authentication Diagnostic</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">Current Session</h3>
            <p>Auth UID: {user?.id || 'None'}</p>
            <p>Email: {user?.email || 'None'}</p>
            <p>Session: {session ? 'Active' : 'None'}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">User Data</h3>
            <p>User App ID: {userData?.id || 'None'}</p>
            <p>Auth User ID: {userData?.auth_user_id || 'None'}</p>
            <p>Name: {userData?.name || 'None'}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold">Match Status</h3>
          <p className={user?.id === userData?.auth_user_id ? 'text-green-600' : 'text-red-600'}>
            {user?.id === userData?.auth_user_id ? '✅ IDs Match' : '❌ IDs DO NOT Match'}
          </p>
        </div>

        <div>
          <h3 className="font-semibold">All Users in Database</h3>
          {allUserIds.map((userRow) => (
            <div key={userRow.id} className="text-sm p-2 border rounded">
              <p>App ID: {userRow.id}</p>
              <p>Auth ID: {userRow.auth_user_id}</p>
              <p>Email: {userRow.email}</p>
              <p>Name: {userRow.name}</p>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold">Journal Entries by User ID</h3>
          {journalEntries.map((entry) => (
            <div key={entry.id} className="text-sm p-2 border rounded">
              <p>Entry ID: {entry.id}</p>
              <p>User ID: {entry.user_id}</p>
              <p>Content: {entry.content.substring(0, 100)}...</p>
              <p>Date: {entry.received_at}</p>
            </div>
          ))}
        </div>

        <Button onClick={checkData}>Refresh Data</Button>
      </CardContent>
    </Card>
  )
}