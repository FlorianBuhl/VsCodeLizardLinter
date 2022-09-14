inline int bad_function()
{
  int a;
  int i;

  for(i=0; i < 20; i++)
  {
    if(i==0)
    {
      a = a + i;
    }
    a = a + i;
  }

  return a;
}
