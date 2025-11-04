import { describe, test, expect, beforeEach } from "vitest";

import { version } from "../package.json";

import fs from "fs";

describe("Test documentation files", () => {
    test("Version history includes current version", () => {
        const readme = fs.readFileSync("versionhistory.md", "utf8");
        const currentVersion = version;
        const regex = new RegExp(`##?\\s*${currentVersion}`, "i");
        expect(readme, `File versionhistory.md should include a chapter for the current version ${version}.\n`).toMatch(
            regex
        );
    });
});
