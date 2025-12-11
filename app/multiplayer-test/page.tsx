import SignalingExample from '@/components/webrtc/SignalingExample'

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL ?? 'ws://localhost:8080'

export default function MultiplayerTestPage() {
  return (
    <div className="h-screen overflow-y-auto bg-linear-to-b from-gray-900 to-gray-800">
      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-white">WebRTC Multiplayer Test</h1>
          <p className="text-gray-400">
            Test the complete WebRTC flow with automatic signaling
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Open this page in two browser windows to test peer-to-peer connection
          </p>
        </div>

        <SignalingExample />

        <div className="mt-8 rounded-lg bg-gray-800 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Instructions</h2>
          <ol className="space-y-2 text-gray-300">
            <li className="flex gap-3">
              <span className="font-bold text-blue-400">1.</span>
              <span>
                Make sure the signaling server is running:{' '}
                <code className="rounded bg-gray-700 px-2 py-1 text-sm">
                  cd signaling-server && npm run dev
                </code>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-400">2.</span>
              <span>Open this page in two browser windows (or tabs)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-400">3.</span>
              <span>
                In the first window, click <strong>&quot;Create Room&quot;</strong>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-400">4.</span>
              <span>
                In the second window, click <strong>&quot;Join Room&quot;</strong> with the same
                room ID
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-400">5.</span>
              <span>Once connected, type messages and send them between peers</span>
            </li>
          </ol>

          <div className="mt-6 rounded border border-gray-700 bg-gray-900 p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-400">Expected Flow:</h3>
            <ul className="space-y-1 text-sm text-gray-500">
              <li>✓ Signaling server connects</li>
              <li>✓ Room is created/joined</li>
              <li>✓ SDP offer/answer exchange (automatic)</li>
              <li>✓ ICE candidates exchanged (automatic)</li>
              <li>✓ Peer connection established</li>
              <li>✓ Data channel opens</li>
              <li>✓ Messages can be sent/received</li>
            </ul>
          </div>

          <div className="mt-4 rounded border border-yellow-800 bg-yellow-900/20 p-4">
            <h3 className="mb-2 text-sm font-semibold text-yellow-400">Troubleshooting:</h3>
            <ul className="space-y-1 text-sm text-yellow-200/80">
              <li>
                • If &quot;Signaling: Disconnected&quot; - Check server is running on
                {SIGNALING_URL}
              </li>
              <li>
                • If &quot;Connection: Failed&quot; - Check browser console for WebRTC errors
              </li>
              <li>
                • If stuck on &quot;Connecting&quot; - Verify ICE candidates are being exchanged
              </li>
              <li>• Open browser DevTools → Console to see detailed logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
