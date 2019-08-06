const path = require("path");
import { dockerBuild } from "./docker-build";
import { docker } from "./docker";

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
  it("Should build without any options", async () => {
    await expect(dockerBuild({}, { silent: true })).resolves.not.toThrow();
  });

  it("Should build with context argument without any error", async () => {
    await expect(
      dockerBuild(
        {
          context: path.resolve(__dirname, "__testdata__/context")
        },
        { silent: true }
      )
    ).resolves.not.toThrow();
  });

  it("Should build with tag argument without any error", async () => {
    await expect(
      dockerBuild(
        {
          context: path.resolve(__dirname, "__testdata__/context"),
          tag: "hellow-word:latest"
        },
        { silent: true }
      )
    ).resolves.not.toThrow();
  });

  it("Should build with --no-cache argument without any error", async () => {
    await expect(
      dockerBuild(
        {
          "--no-cache": "",
          context: path.resolve(__dirname, "__testdata__/context"),
          tag: "kube-tools.hellow-word:latest"
        },
        { silent: true }
      )
    ).resolves.not.toThrow();
  });
});
