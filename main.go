package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	clientID string
}

type MousePosition struct {
	ClientID string  `json:"clientId"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Color    string  `json:"color"`
}

type Hub struct {
	clients         map[*Client]bool
	mousePositions  map[string]MousePosition
	broadcast       chan []byte
	register        chan *Client
	unregister      chan *Client
	mutex           sync.Mutex
	positionUpdated chan struct{}
}

func newHub() *Hub {
	return &Hub{
		clients:         make(map[*Client]bool),
		mousePositions:  make(map[string]MousePosition),
		broadcast:       make(chan []byte),
		register:        make(chan *Client),
		unregister:      make(chan *Client),
		positionUpdated: make(chan struct{}),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			h.broadcastAllPositions()
		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				delete(h.mousePositions, client.clientID)
				close(client.send)
			}
			h.mutex.Unlock()
			h.broadcastAllPositions()
		case message := <-h.broadcast:
			h.broadcastMessage(message)
		case <-h.positionUpdated:
			h.broadcastAllPositions()
		}
	}
}

func (h *Hub) broadcastMessage(message []byte) {
	h.mutex.Lock()
	for client := range h.clients {
		select {
		case client.send <- message:
		default:
			close(client.send)
			delete(h.clients, client)
			delete(h.mousePositions, client.clientID)
		}
	}
	h.mutex.Unlock()
}

func (h *Hub) broadcastAllPositions() {
	h.mutex.Lock()
	positions := make([]MousePosition, 0, len(h.mousePositions))
	for _, pos := range h.mousePositions {
		positions = append(positions, pos)
	}
	h.mutex.Unlock()

	message, err := json.Marshal(positions)
	if err != nil {
		log.Printf("error marshaling positions: %v", err)
		return
	}

	h.broadcastMessage(message)
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for this example
	},
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(60 * time.Second)); return nil })

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var mousePos MousePosition
		if err := json.Unmarshal(message, &mousePos); err != nil {
			log.Printf("error unmarshaling message: %v", err)
			continue
		}

		mousePos.ClientID = c.clientID

		log.Printf("Received mouse position: %+v", mousePos)

		c.hub.mutex.Lock()
		c.hub.mousePositions[c.clientID] = mousePos
		c.hub.mutex.Unlock()
		c.hub.positionUpdated <- struct{}{}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func handleWebSocket(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	clientID := uuid.New().String()
	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256), clientID: clientID}
	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}

func main() {
	hub := newHub()
	go hub.run()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(hub, w, r)
	})

	log.Println("Server starting on :4000")
	err := http.ListenAndServe(":4000", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
