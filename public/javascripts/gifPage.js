const page = (function() {
	function destroy(fileUniqueId) {
		if (window.confirm("Are you sure you want to delete this post?")) {
			fetch(`${fileUniqueId}`, {
				method: "delete"
			}).then(response => response.json())
			.then(jsonData => console.log(jsonData))
			.catch(error => console.error(error));
		}
	}
	return {
		destroy: destroy
	};
})();