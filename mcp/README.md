# GoClaw MCP Server (Rulax)

Đây là Model Context Protocol (MCP) Server dành riêng cho GoClaw, cho phép AI Agent giao tiếp với cơ sở dữ liệu `brain.db` của website Rulax thông qua HTTP/SSE.

## Cài đặt trên VPS

1. Cài đặt các package cần thiết:
   ```bash
   cd /opt/rulax/mcp
   npm install
   ```

2. Cài đặt Systemd Service để tự khởi động:

   Tạo file `/etc/systemd/system/rulax-mcp.service`:
   ```ini
   [Unit]
   Description=Rulax MCP Server for GoClaw
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/opt/rulax/mcp
   ExecStart=/usr/bin/node index.js
   Restart=on-failure
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

3. Khởi động service:
   ```bash
   systemctl daemon-reload
   systemctl enable rulax-mcp
   systemctl start rulax-mcp
   systemctl status rulax-mcp
   ```

## API Endpoint
MCP Server sẽ lắng nghe tại:
- **SSE Connection:** `http://127.0.0.1:3001/sse`
- **Message POST:** `http://127.0.0.1:3001/messages`

*(Chỉ lắng nghe trên localhost để đảm bảo bảo mật, GoClaw agent có thể kết nối nội bộ).*
