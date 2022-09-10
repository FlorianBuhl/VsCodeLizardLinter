object add {
   def bad_function( a:Int, b:Int ) : Int = {

      var i = 0;

      // for loop execution with a range
      for( i <- 1 to 10){
        if( i < 20 ){
            println("This is if statement");
         }
         println( "Value of i: " + i );
      }
      var sum:Int = 0
      sum = a + b
      return sum
   }
}
