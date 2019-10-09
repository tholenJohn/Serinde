var client = algoliasearch("latency", "6be0576ff61c053d5f9a3225e2a90f76")
var index = client.initIndex('movies');
var myAutocomplete = autocomplete('#search-input', { hint: false }, [{
    source: autocomplete.sources.hits(index, { hitsPerPage: 5 }),
    displayKey: 'title',
    templates: {
        suggestion: function(suggestion) {
            var sugTemplate = "<img src='" + suggestion.image + "'/><span>" + suggestion._highlightResult.title.value + "</span>"
            return sugTemplate;
        }
    }
}]).on('autocomplete:selected', function(event, suggestion, dataset) {
    console.log(suggestion, dataset);
});

document.querySelector(".searchbox [type='reset']").addEventListener("click", function() {
    document.querySelector(".aa-input").focus();
    this.classList.add("hide");
    myAutocomplete.autocomplete.setVal("");
});

document.querySelector("#search-input").addEventListener("keyup", function() {
    var searchbox = document.querySelector(".aa-input");
    var reset = document.querySelector(".searchbox [type='reset']");
    if (searchbox.value.length === 0) {
        reset.classList.add("hide");
    } else {
        reset.classList.remove('hide');
    }
});