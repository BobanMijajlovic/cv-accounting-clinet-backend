import 'reflect-metadata'

module.exports = {
    up: function(queryInterface, Sequelize) {
        // logic for transforming into the new state
        return queryInterface.addColumn(
            'ItemsImages',
            'googleId',
            {
                allowNull: true,
                type:  Sequelize.STRING(256),
                comment: 'Google drive file ID',
                field: 'google_id'
            }
        );

    },

    down: function(queryInterface, Sequelize) {
        // logic for reverting the changes
        return queryInterface.removeColumn(
            'ItemsImages',
            'googleId',
        );
    }
}