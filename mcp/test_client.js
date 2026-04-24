const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

async function test() {
    const transport = new SSEClientTransport(new URL('http://127.0.0.1:3001/sse'));
    const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
    
    await client.connect(transport);
    console.log("Connected to MCP Server");

    const tools = await client.listTools();
    console.log("Available tools:", tools.tools.map(t => t.name));

    console.log("\n--- Testing get_daily_sales_summary ---");
    const res1 = await client.callTool({ name: "get_daily_sales_summary", arguments: {} });
    console.log(res1.content[0].text);

    console.log("\n--- Testing get_hot_waitlist_leads ---");
    const res2 = await client.callTool({ name: "get_hot_waitlist_leads", arguments: { limit: 2 } });
    console.log(res2.content[0].text);

    console.log("\n--- Testing update_order_shipping_status ---");
    const res3 = await client.callTool({ name: "update_order_shipping_status", arguments: { order_id: 99999, status: "Test" } });
    console.log(res3.content[0].text);

    process.exit(0);
}

test().catch(console.error);
