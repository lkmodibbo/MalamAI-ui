import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export default function SubjectCard({ name, emoji, color = COLORS.primary, onPress }) {
	return (
		<TouchableOpacity style={[styles.card, { backgroundColor: color }]} onPress={onPress}>
			<Text style={styles.emoji}>{emoji}</Text>
			<Text style={styles.name}>{name}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	card: {
		width: '28%',
		aspectRatio: 1,
		borderRadius: 10,
		padding: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
		shadowColor: COLORS.shadow,
		shadowOpacity: 0.12,
		shadowRadius: 6,
	},
	emoji: {
		fontSize: 14,
		marginBottom: 8,
	},
	name: {
		color: COLORS.textWhite,
		fontWeight: '500',
		textAlign: 'center',
		fontSize: 10,
	}
});
