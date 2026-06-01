import { Volt } from "@thevoltcloud/sdk";

const client = new Volt();
const stream = await client.chat.completions.create({
  model: "llama-3.3-70b-instruct",
  messages: [{ role: "user", content: "Write a haiku about sovereign clouds." }],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0].delta.content);
}
process.stdout.write("\n");
