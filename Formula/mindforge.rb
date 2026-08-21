class Mindforge < Formula
  desc "Agentic-intelligence framework for Claude Code — commands, subagents, governance"
  homepage "https://github.com/sairam0424/MindForge"
  url "https://registry.npmjs.org/mindforge-cc/-/mindforge-cc-11.9.3.tgz"
  sha256 "74442d09e6951b7699012eaa1fbb0c3d63021beb8b2de3d7eed5ef8e3c0186b5"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir[libexec/"bin/*"]
  end

  test do
    # mindforge-cc installs the framework into a target project; --version
    # must work without a project context.
    assert_match "11.9.3", shell_output("#{bin}/mindforge --version 2>&1", 0)
  end
end
