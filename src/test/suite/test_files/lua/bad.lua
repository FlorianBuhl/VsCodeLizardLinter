-- add all elements of array `a'
function bad_function (a)
  local sum = 0
  for i,v in ipairs(a) do
    if a<0 then a = 0 end
    sum = sum + v
  end
  return sum
end
