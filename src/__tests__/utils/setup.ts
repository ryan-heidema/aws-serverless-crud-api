// Silence console.error in tests to keep output clean
jest.spyOn(console, "error").mockImplementation(() => {});
