import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";

const WS_URL = "ws://192.168.8.101:4000/ws";
const MAX_RETRIES = 5;

interface CursorPosition {
	clientId: string;
	x: number;
	y: number;
}

function App() {
	const [retryCount, setRetryCount] = useState(0);
	const [cursors, setCursors] = useState<CursorPosition[]>([]);
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
				if (Array.isArray(data)) {
					setCursors(data);
				}
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

			if (isConnected && socketRef.current) {
				socketRef.current.send(
					JSON.stringify({
						x: clientX,
						y: clientY,
					}),
				);
			}
		},
		[isConnected],
	);

	useEffect(() => {
		if (retryCount >= MAX_RETRIES) {
			console.log("Max retries reached. Stopping reconnection attempts.");
		}
	}, [retryCount]);

	console.log(cursors);

	return (
		<div
			className="App"
			onMouseMove={handleMouseMove}
			style={{ width: "100vw", height: "100vh" }}
		>
			<h1>Cursor Tracking</h1>
			<div>{isConnected ? "Connected" : "Disconnected"}</div>
			{cursors.map((cursor) => (
				<div
					key={cursor.clientId}
					className="remote-cursor"
					style={{
						position: "fixed",
						left: 0,
						top: 0,
						transform: `translate(${cursor.x}px, ${cursor.y}px)`,
						width: "20px",
						height: "20px",
						borderRadius: "50%",
						backgroundColor: "red",
						pointerEvents: "none",
						zIndex: 9998,
					}}
				/>
			))}
		</div>
	);
}

export default App;
