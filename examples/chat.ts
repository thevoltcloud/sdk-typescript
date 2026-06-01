import { Volt } from "@thevoltcloud/sdk";

const client = new Volt(); // reads VOLT_API_KEY
const resp = await client.chat.completions.create({
  model: "llama-3.3-70b-instruct",
  messages: [{ role: "user", content: "Explain CAP theorem in one sentence." }],
});
console.log(resp.choices[0].message.content);
console.log("served by", resp.volt.podId, "in", resp.volt.metro);
