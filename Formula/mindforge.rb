class Mindforge < Formula
  desc "Agentic-intelligence framework for Claude Code — commands, subagents, governance"
  homepage "https://github.com/sairam0424/MindForge"
  url "https://registry.npmjs.org/mindforge-cc/-/mindforge-cc-11.9.9.tgz"
  sha256 "851257b0757ce62f1a3f16b82ec80d9940524a6f82c8d13d83acd026f4f4cacb"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir[libexec/"bin/*"]
  end

  test do
    # mindforge-cc installs the framework into a target project; --version
    # must work without a project context.
    assert_match "11.9.9", shell_output("#{bin}/mindforge --version 2>&1", 0)
  end
end
