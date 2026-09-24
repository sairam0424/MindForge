class Mindforge < Formula
  desc "Agentic-intelligence framework for Claude Code — commands, subagents, governance"
  homepage "https://github.com/sairam0424/MindForge"
  url "https://registry.npmjs.org/mindforge-cc/-/mindforge-cc-12.0.0.tgz"
  sha256 "40b2c18f55ff6813d556cde938d22c366232ae473c03be02503852f9c1a1d6f6"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir[libexec/"bin/*"]
  end

  test do
    # mindforge-cc installs the framework into a target project; --version
    # must work without a project context.
    assert_match "12.0.0", shell_output("#{bin}/mindforge --version 2>&1", 0)
  end
end
