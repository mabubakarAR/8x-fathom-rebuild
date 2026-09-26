# Sample transcripts

Drop either of these into [`/import`](https://ainoted.vercel.app/import) to watch the real pipeline run.

| File | What it's for |
|---|---|
| `renewal-call.vtt` | The happy path — six speakers, a decision that gets reversed, numbers that matter. Named speakers, so you can check the pipeline keeps the names the file gave it instead of letting the model rename them. |
| `anonymous-standup.txt` | No timestamps, no speaker tags, no structure at all. The parser synthesises timings from speaking rate and says so; the model has to work out who is who from what is said. |

Things worth checking once a run finishes:

- **Every bullet has a timestamp.** Click one. It should land on the line the claim came from, not near it.
- **The Evidence tab.** It shows how many claims the model made, how many resolved to a real line, and quotes whatever was thrown away.
- **Ask something the transcript does not answer** — try *"what is the contract value?"* on `renewal-call.vtt`. A good answer says the transcript doesn't cover it. A bad one invents a number.
