import { sleep } from "../../common/sleep";
import { docker } from "./docker";
import { dockerBuild } from "./docker-build";
// import { launch } from "@01/launcher";

beforeAll(async () => {
  await dockerBuild();
});

afterAll(async () => {
  const result = await docker(
    "images",
    {
      format: "{{.Repository}}",
      filter: `reference=kube-tools*`
    },
    {
      stdio: ["pipe", "pipe", process.stderr]
    }
  );
  const repos = result.split("\n").filter(repo => repo);
  if (repos.length > 0) {
    try {
      await docker("rmi", repos, { silent: true });
    } catch (e) {
      //ignore, images might already removed
    }
  }
});

describe("Docker test suite", () => {
  it("Should get all images", async () => {
    await expect(docker("images", {}, { silent: true })).resolves.not.toThrow();
  });

  it("Should get images with specific output format", async () => {
    await expect(
      docker(
        "images",
        {
          format: "{{.ID}}: {{.Repository}}"
        },
        { silent: true }
      )
    ).resolves.not.toThrow();
    await sleep(1000);
  });

  xit("Should get images with filter", async () => {
    const { USER } = process.env;
    await expect(dockerBuild({}, { silent: true })).resolves.not.toThrow();
    const result = await docker(
      "images",
      {
        format: "{{.Repository}}",
        filter: `reference=kube-tools.${USER}.dev:*`
      },
      {
        stdio: ["pipe", "pipe", process.stderr],
        silent: true
      }
    );
    const repos = result.split("\n").filter(repo => repo);
    expect(repos.length).toBeGreaterThan(0);
  });
});
