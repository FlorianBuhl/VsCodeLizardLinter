public class TestClass
{
  public String bad_function()
  {
    for(int i=0; i<10; i++)
    {
      if(i==3)
      {
        return "bad";
      }
    }
    return "good";
  }
}
