const page = (function() {
	function patch(fileUniqueId) {
		tags = "";
		for (const category of document.forms.gifPatch.tags.elements) {
			for (const tag of category.value.split(" ").filter(elmt => elmt.length)) {
				tags += `${category.name}:${tag} `;
			}
		}
		fetch(`/gif/${fileUniqueId}`, {
			method: "PATCH",
			body: JSON.stringify({
				tags: tags.trim(),
				sources: document.forms.gifPatch.sources.value,
				rating: document.forms.gifPatch.rating.value
			}),
			headers: {
				"Content-type": "application/json; charset=UTF-8",
			}
		})
		.then(response => response.json())
		.then(jsonData => {
			console.log(jsonData);
			//window.location = `gif/${fileUniqueId}`;
		})
		.catch(error => console.error(error));
	}
	function destroy(fileUniqueId) {
		if (window.confirm("Are you sure you want to delete this post?")) {
			fetch(`${fileUniqueId}`, {
				method: "delete"
			})
			.then(response => response.json())
			.then(jsonData => console.log(jsonData))
			.catch(error => console.error(error));
		}
	}
	return {
		patch: patch,
		destroy: destroy
	};
})();