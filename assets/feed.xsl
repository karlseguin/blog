<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
	<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
	<xsl:template match="/">
	<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
		<head>
			<title><xsl:value-of select="/atom:feed/atom:title"/></title>
			<style type="text/css">
				body{max-width:768px; margin:30px auto; font-family:sans-serif; font-size:16px; line-height:1.5em}
				h1{font-size: 30px; margin: 30px 0 0}
				.alert{background: #edf5ff; border:1px solid #4f97d1; padding:12px;border-radius: 4px;}
				.entry {padding: 15px 0; border-bottom: 1px solid #ddd;}
				.entry a {color: #1c5bb3; text-decoration: none}
				.entry .created {color: #555; font-size: 16px;margin-top: 10px}
				.entry:last-of-type{border: 0}
				.entry h3{margin-bottom:0}
				.entry p{margin:4px 0;line-height: 26px}
				pre{overflow: auto; width: 100%; border: 1px solid #e9e9e5; margin-bottom: 20px;padding:10px}
			</style>
		</head>
		<body>
			<p class="alert">This is an RSS feed. Visit <a href="https://aboutfeeds.com">About Feeds</a> to learn more and get started.</p>
			<h1>openmymind.net</h1>
			<xsl:for-each select="/atom:feed/atom:entry">
				<div class="entry">
					<h3>
						<a target="_blank">
							<xsl:attribute name="href"><xsl:value-of select="atom:id"/></xsl:attribute>
							<xsl:value-of select="atom:title"/>
						</a>
					</h3>
					<p><xsl:value-of select="atom:content" disable-output-escaping="yes" /></p>
					<div class="created"><xsl:value-of select="atom:updated" /></div>
				</div>
			</xsl:for-each>
		</body>
		</html>
	</xsl:template>
</xsl:stylesheet>
