let people = ["Anna": 67, "Julia": 8, "Hans": 33, "Peter": 25]
for (name, age) in people {
    print("\(name) ist \(age) Jahre alt.")
}

// functions (aka "named closures")
func sayHelloTo(yourName name: String) -> Void {
    print("Hello \(name)")
}
