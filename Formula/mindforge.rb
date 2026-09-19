class Mindforge < Formula
  desc "Agentic-intelligence framework for Claude Code — commands, subagents, governance"
  homepage "https://github.com/sairam0424/MindForge"
  url "https://registry.npmjs.org/mindforge-cc/-/mindforge-cc-11.9.6.tgz"
  sha256 "6cec6db16f3d80c39fc6381b7b0967f30e25d86ca0943238df7d8a5d46ff847f"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir[libexec/"bin/*"]
  end

  test do
    # mindforge-cc installs the framework into a target project; --version
    # must work without a project context.
    assert_match "11.9.6", shell_output("#{bin}/mindforge --version 2>&1", 0)
  end
end
