import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";

const WS_URL = "ws://localhost:4000/ws";
const MAX_RETRIES = 5;

function App() {
	const [retryCount, setRetryCount] = useState(0);
	const [cursors, setCursors] = useState<{
		[clientId: string]: { x: number; y: number };
	}>({});
	const [isConnected, setIsConnected] = useState(false);
	const socketRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		const connectWebSocket = () => {
			const socket = new WebSocket(WS_URL);

			socket.onopen = () => {
				console.log("WebSocket Connected");
				setRetryCount(0);
				setIsConnected(true);
				socketRef.current = socket;
			};

			socket.onmessage = (event) => {
				const data = JSON.parse(event.data);
				setCursors((prevCursors) => ({
					...prevCursors,
					[data.clientId]: { x: data.x, y: data.y },
				}));
			};

			socket.onerror = (error) => {
				console.error("WebSocket Error:", error);
			};

			socket.onclose = () => {
				console.log("WebSocket Disconnected");
				setIsConnected(false);
				socketRef.current = null;
				setRetryCount((prevCount) => prevCount + 1);
				if (retryCount < MAX_RETRIES) {
					setTimeout(connectWebSocket, 5000);
				}
			};
		};

		connectWebSocket();

		return () => {
			if (socketRef.current) {
				socketRef.current.close();
			}
		};
	}, [retryCount]);

	const handleMouseMove = useCallback(
		(event: React.MouseEvent) => {
			const { clientX, clientY } = event;
			console.log("Sending", { x: clientX, y: clientY });

			if (isConnected && socketRef.current) {
				socketRef.current.send(JSON.stringify({ x: clientX, y: clientY }));
			}
		},
		[isConnected],
	);

	useEffect(() => {
		if (retryCount >= MAX_RETRIES) {
			console.log("Max retries reached. Stopping reconnection attempts.");
		}
	}, [retryCount]);

	return (
		<div className="App" onMouseMove={handleMouseMove}>
			<h1>Cursor App</h1>
			<div>{isConnected ? "Connected" : "Disconnected"}</div>
			<div className="cursor-container">
				{Object.entries(cursors).map(([clientId, position]) => (
					<div
						key={clientId}
						className="mouse-cursor"
						style={{
							position: "absolute",
							left: `${position.x}px`,
							top: `${position.y}px`,
							width: "20px",
							height: "20px",
							borderRadius: "50%",
							backgroundColor: "red",
							pointerEvents: "none",
						}}
					/>
				))}
			</div>
		</div>
	);
}

export default App;
