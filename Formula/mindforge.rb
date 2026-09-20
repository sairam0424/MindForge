class Mindforge < Formula
  desc "Agentic-intelligence framework for Claude Code — commands, subagents, governance"
  homepage "https://github.com/sairam0424/MindForge"
  url "https://registry.npmjs.org/mindforge-cc/-/mindforge-cc-11.9.7.tgz"
  sha256 "92a3834ed93f7adb40c2f420e6cbcaa15b4c1d298f479d4ef88373ac8f0a7b42"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir[libexec/"bin/*"]
  end

  test do
    # mindforge-cc installs the framework into a target project; --version
    # must work without a project context.
    assert_match "11.9.7", shell_output("#{bin}/mindforge --version 2>&1", 0)
  end
end
