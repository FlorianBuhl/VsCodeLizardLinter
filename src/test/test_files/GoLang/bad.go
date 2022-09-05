func bad_function() {
	sum := 0
	for i := 0; i < 10; i++ {
		if i := 9; i < 0 {
			fmt.Println(i, "is negative")
			sum += i
		}
	}
	fmt.Println(sum)
	fmt.Println("My favorite number is", rand.Intn(10))
}
