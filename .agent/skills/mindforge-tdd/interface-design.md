# Interface Design through TDD

TDD is your best tool for designing clean, usable interfaces. By writing the test first, you are the **first consumer** of your own API.

## Design Signals from Tests

### "This test is too hard to setup"
- **Signal**: Your class has too many dependencies or is doing too much (violating SRP).
- **Fix**: Break the class into smaller, more focused components.

### "I have to mock 5 things just to test one method"
- **Signal**: Excessive coupling.
- **Fix**: Use Dependency Injection and define clearer boundaries.

### "I don't know what to name this test"
- **Signal**: The behavior is ill-defined or the module has "Identity Crisis".
- **Fix**: Re-evaluate the purpose of the component.

## Best Practices
- **Prefer Composition over Inheritance**: Tests are much easier to write for composed objects.
- **Keep Interfaces Narrow**: Only expose what is absolutely necessary for the consumer (and the test).
- **Return Meaningful Values**: Avoid `void` where possible; returning results makes assertion-based testing natural.
