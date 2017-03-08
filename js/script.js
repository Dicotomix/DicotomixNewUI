// Update the display of current word
function updateWord($string)
{
    document.getElementById("result").innerHTML = $string;
}

// the global_answer answer, concatenation of all words
var global_answer = "";
var erreur;

function updateAnswer()
{
    if (erreur == 0)
    {
      var $string = document.getElementById("result").innerHTML
      global_answer = global_answer + " " + $string;
      document.getElementById("full_answer").innerHTML = global_answer;
    }
}

// Event listeners
// We listen the both arrows
// And the discard
document.getElementById("next").addEventListener("click", right);
document.getElementById("previous").addEventListener("click", left);
document.getElementById("discard").addEventListener("click", discard);
document.getElementById("ok").addEventListener("click", valid);

function valid()
{
  if (erreur == 0)
  {
    updateAnswer()
    reset()
  }
}

function reset()
{
  $.ajax({
    url: '../cgi-bin/connect.py',
    success: function (html)
    {
      if (html.length > 25)
      {
        erreur = 1;
        updateWord(" /!\\ Erreur /!\\");
      }
      else
      {
        erreur = 0;
        var sanitized = html.replace(/[^\w\s]/gi, '')
        updateWord(sanitized);
      }
    }
  });
}

window.onload = function()
{
  reset()
};
