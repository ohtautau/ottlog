package main

import "fmt"

var a chan int
var b chan<- int
var c <-chan int

func main() {
	a = make(chan int)
	b = make(chan int)
	//c = make(chan int) //can not

	go func() {
		a <- 666
	}()

	x := <-a
	fmt.Println(x)
}
