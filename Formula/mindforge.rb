class Mindforge < Formula
  desc "Agentic-intelligence framework for Claude Code — commands, subagents, governance"
  homepage "https://github.com/sairam0424/MindForge"
  url "https://registry.npmjs.org/mindforge-cc/-/mindforge-cc-11.9.8.tgz"
  sha256 "20f8926f3196a821955c03c9983d0ea5525f0467b16f84745457abe4e540e701"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir[libexec/"bin/*"]
  end

  test do
    # mindforge-cc installs the framework into a target project; --version
    # must work without a project context.
    assert_match "11.9.8", shell_output("#{bin}/mindforge --version 2>&1", 0)
  end
end
