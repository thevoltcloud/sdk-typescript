import { SovereigntyViolation, Volt } from "@thevoltcloud/sdk";

const client = new Volt({ sovereign: true, pinnedMetro: "us-east-iad" });
try {
  const resp = await client.chat.completions.create({
    model: "llama-3.3-70b-instruct",
    messages: [{ role: "user", content: "Summarize this contract." }],
    pod_affinity: "contract-review-42",
  });
  console.log(resp.choices[0].message.content);
  console.log("verified:", resp.volt.tier, resp.volt.metro);
} catch (e) {
  if (e instanceof SovereigntyViolation) {
    // Response payload is withheld on a mismatch.
    console.error("sovereignty breach withheld:", e.message);
  } else {
    throw e;
  }
}
