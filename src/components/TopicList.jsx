import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../constants/colors';

export default function TopicList({ subjectName, topics = [], onSelectTopic }) {
	const [showTopics, setShowTopics] = useState(false);

	useEffect(() => {
		setShowTopics(false);
	}, [subjectName]);

	if (!topics || topics.length === 0) {
		return (
			<View style={styles.emptyContainer}>
				<Text style={styles.emptyText}>No topics available</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<TouchableOpacity
				activeOpacity={0.85}
				style={styles.headerButton}
				onPress={() => setShowTopics((current) => !current)}
			>
				<Text style={styles.header}>{subjectName} Topics</Text>
				<Text style={styles.arrow}>{showTopics ? '−' : '+'}</Text>
			</TouchableOpacity>

			{showTopics && (
				<ScrollView style={styles.list}>
					{topics.map((t) => (
						<TouchableOpacity key={t} style={styles.item} onPress={() => onSelectTopic && onSelectTopic(t)}>
							<Text style={styles.itemText}>{t}</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginTop: 12,
		paddingHorizontal: 4,
	},
	headerButton: {
		backgroundColor: COLORS.primary,
		borderRadius: 12,
		paddingVertical: 13,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		shadowColor: COLORS.shadow,
		shadowOpacity: 0.08,
		shadowRadius: 6,
	},
	header: {
		color: COLORS.textWhite,
		fontWeight: '700',
		fontSize: 14
	},
	arrow: {
		color: COLORS.accent,
		fontWeight: '800',
		fontSize: 13
	},
	list: {
		maxHeight: 220,
		marginTop: 8,
	},
	item: {
		backgroundColor: COLORS.surface,
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 12,
		marginBottom: 8,
		shadowColor: COLORS.shadow,
		shadowOpacity: 0.06,
		shadowRadius: 6,
	},
	itemText: {
		color: COLORS.secondary,
		fontWeight: '600'
	},
	emptyContainer: {
		padding: 12,
		alignItems: 'center'
	},
	emptyText: {
		color: COLORS.textMuted
	}
});
